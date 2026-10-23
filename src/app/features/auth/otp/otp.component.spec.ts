import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { vi } from 'vitest';
import { OtpComponent } from './otp.component';
import { AuthService } from '../../../core/auth/auth.service';
import { ToastService } from '../../../shared/ui/toast/toast.service';

describe('OtpComponent', () => {
  let authMock: {
    pendingOtpUserId: ReturnType<typeof vi.fn>;
    validateOtp: ReturnType<typeof vi.fn>;
    homeRoute: ReturnType<typeof vi.fn>;
    resendOtp: ReturnType<typeof vi.fn>;
  };
  let routerMock: { navigate: ReturnType<typeof vi.fn>; navigateByUrl: ReturnType<typeof vi.fn> };
  let returnUrl: string | null;
  let toastMock: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn>; clear: ReturnType<typeof vi.fn> };

  function createComponent(): OtpComponent {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        OtpComponent,
        { provide: AuthService, useValue: authMock },
        { provide: Router, useValue: routerMock },
        { provide: ToastService, useValue: toastMock },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: { get: (key: string) => (key === 'returnUrl' ? returnUrl : null) } } },
        },
      ],
    });
    return TestBed.inject(OtpComponent);
  }

  beforeEach(() => {
    authMock = {
      pendingOtpUserId: vi.fn().mockReturnValue('u1'),
      validateOtp: vi.fn().mockResolvedValue({ is_successful: true, token: 't', message: 'ok' }),
      homeRoute: vi.fn().mockReturnValue('/student'),
      resendOtp: vi.fn().mockResolvedValue({ message: 'Si tu cuenta existe, te enviamos un código.' }),
    };
    routerMock = { navigate: vi.fn(), navigateByUrl: vi.fn() };
    returnUrl = null;
    toastMock = { success: vi.fn(), error: vi.fn(), clear: vi.fn() };
  });

  it('redirects to /login when there is no pending login', () => {
    authMock.pendingOtpUserId.mockReturnValue(null);
    createComponent();
    expect(routerMock.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('accepts a valid 6-char hex code (uppercase)', () => {
    const c = createComponent();
    c.otpControl.setValue('A3F9C2');
    expect(c.otpForm.valid).toBe(true);
  });

  it('rejects codes that are not exactly 6 hex chars', () => {
    const c = createComponent();
    c.otpControl.setValue('A3F9C');       // 5 chars
    expect(c.otpForm.valid).toBe(false);
    c.otpControl.setValue('A3F9C2X');     // 7 chars
    expect(c.otpForm.valid).toBe(false);
    c.otpControl.setValue('G3F9C2');      // G no es hex
    expect(c.otpForm.valid).toBe(false);
  });

  it('uppercases the code as it is typed', () => {
    const c = createComponent();
    c.otpControl.setValue('a3f9c2');
    expect(c.otpControl.value).toBe('A3F9C2');
    expect(c.otpForm.valid).toBe(true);
  });

  it('validates the OTP and redirects by role on success', async () => {
    const c = createComponent();
    c.otpControl.setValue('A3F9C2');
    await c.onSubmit();
    expect(authMock.validateOtp).toHaveBeenCalledWith('u1', 'A3F9C2');
    expect(routerMock.navigate).toHaveBeenCalledWith(['/student']);
  });

  it('goes back to the address from the link when it belongs to the role module', async () => {
    returnUrl = '/student/assessments?result=abc123';
    const c = createComponent();
    c.otpControl.setValue('A3F9C2');
    await c.onSubmit();
    expect(routerMock.navigateByUrl).toHaveBeenCalledWith('/student/assessments?result=abc123');
    expect(routerMock.navigate).not.toHaveBeenCalled();
  });

  it('ignores an address from another role module and goes to the role home', async () => {
    returnUrl = '/admin/users';
    const c = createComponent();
    c.otpControl.setValue('A3F9C2');
    await c.onSubmit();
    expect(routerMock.navigateByUrl).not.toHaveBeenCalled();
    expect(routerMock.navigate).toHaveBeenCalledWith(['/student']);
  });

  it('ignores addresses that are not internal routes', async () => {
    returnUrl = '//evil.example.com/student';
    const c = createComponent();
    c.otpControl.setValue('A3F9C2');
    await c.onSubmit();
    expect(routerMock.navigateByUrl).not.toHaveBeenCalled();
    expect(routerMock.navigate).toHaveBeenCalledWith(['/student']);
  });

  it('clears the notices of the previous attempt before verifying a new code', async () => {
    const c = createComponent();
    c.otpControl.setValue('A3F9C2');
    await c.onSubmit();
    expect(toastMock.clear).toHaveBeenCalledTimes(1);
  });

  it('does not clear anything when the code is invalid and nothing is sent', async () => {
    const c = createComponent();
    c.otpControl.setValue('xx');
    await c.onSubmit();
    expect(toastMock.clear).not.toHaveBeenCalled();
  });

  it('shows an error toast when the code is wrong', async () => {
    authMock.validateOtp.mockResolvedValue({ is_successful: false, token: null, message: 'Código inválido' });
    const c = createComponent();
    c.otpControl.setValue('A3F9C2');
    await c.onSubmit();
    expect(toastMock.error).toHaveBeenCalledWith('Código incorrecto', 'Código inválido');
  });

  it('does not call validateOtp when the code is invalid', async () => {
    const c = createComponent();
    c.otpControl.setValue('123');
    await c.onSubmit();
    expect(authMock.validateOtp).not.toHaveBeenCalled();
  });

  describe('resendOtp', () => {
    it('resends the code and starts a cooldown', async () => {
      vi.useFakeTimers();
      const c = createComponent();

      await c.resendOtp();

      expect(authMock.resendOtp).toHaveBeenCalledWith('u1');
      expect(toastMock.success).toHaveBeenCalledWith('Código reenviado', expect.any(String));
      expect(c.resendCooldown()).toBe(30);

      vi.advanceTimersByTime(1000);
      expect(c.resendCooldown()).toBe(29);

      vi.advanceTimersByTime(29000);
      expect(c.resendCooldown()).toBe(0);
      vi.useRealTimers();
    });

    it('does not resend again while the cooldown is active', async () => {
      vi.useFakeTimers();
      const c = createComponent();

      await c.resendOtp();
      await c.resendOtp();

      expect(authMock.resendOtp).toHaveBeenCalledTimes(1);
      vi.useRealTimers();
    });

    it('shows an error toast when the resend fails', async () => {
      authMock.resendOtp.mockRejectedValue(new Error('Sin conexión al servidor'));
      const c = createComponent();

      await c.resendOtp();

      expect(toastMock.error).toHaveBeenCalledWith('No se pudo reenviar el código', 'Sin conexión al servidor');
      expect(c.resendCooldown()).toBe(0);
    });

    it('does nothing when there is no pending user id', async () => {
      authMock.pendingOtpUserId.mockReturnValue(null);
      const c = createComponent();

      await c.resendOtp();

      expect(authMock.resendOtp).not.toHaveBeenCalled();
    });
  });
});
