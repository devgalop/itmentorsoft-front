import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { StudentDashboardComponent } from './student-dashboard.component';
import { AuthService } from '../../../core/auth/auth.service';
import { StudentAssessmentService } from '../../../core/assessments/student-assessment.service';

async function flush(times = 3): Promise<void> {
  for (let i = 0; i < times; i++) {
    await Promise.resolve();
  }
}

describe('StudentDashboardComponent', () => {
  let component: StudentDashboardComponent;
  let fixture: ComponentFixture<StudentDashboardComponent>;
  let authServiceMock: { user: ReturnType<typeof vi.fn>; userId: ReturnType<typeof vi.fn> };
  let studentAssessmentMock: { getQuantity: ReturnType<typeof vi.fn> };

  function setup(
    user: { userName: string; role: string } | null,
    opts?: { userId?: string | null; quantity?: number; reject?: Error },
  ): void {
    const userId = opts && 'userId' in opts ? opts.userId : 's1';
    authServiceMock = {
      user: vi.fn(() => user),
      userId: vi.fn(() => userId),
    };
    studentAssessmentMock = {
      getQuantity: opts?.reject
        ? vi.fn().mockRejectedValue(opts.reject)
        : vi.fn().mockResolvedValue(opts?.quantity ?? 0),
    };

    TestBed.configureTestingModule({
      imports: [StudentDashboardComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceMock },
        { provide: StudentAssessmentService, useValue: studentAssessmentMock },
      ],
    });

    fixture = TestBed.createComponent(StudentDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('creates successfully', () => {
    setup({ userName: 'eider_student', role: 'student' });
    expect(component).toBeTruthy();
  });

  it('greets the student with their username from the JWT', () => {
    setup({ userName: 'eider_student', role: 'student' });
    const greeting = fixture.nativeElement.querySelector('.dash__greeting');
    expect(greeting?.textContent?.trim()).toBe('¡Hola, eider_student!');
  });

  it('falls back to "Estudiante" when there is no user', () => {
    setup(null);
    expect(component.userName()).toBe('Estudiante');
  });

  it('renders three stat cards', () => {
    setup({ userName: 'eider_student', role: 'student' });
    const stats = fixture.nativeElement.querySelectorAll('.dash__stat');
    expect(stats.length).toBe(3);
  });

  it('renders the three "how it works" steps', () => {
    setup({ userName: 'eider_student', role: 'student' });
    const steps = fixture.nativeElement.querySelectorAll('.dash__step');
    expect(steps.length).toBe(3);
  });

  it('loads the real assessments count and shows it in the third stat card', async () => {
    setup({ userName: 'eider_student', role: 'student' }, { userId: 's1', quantity: 4 });
    await flush();
    fixture.detectChanges();

    expect(studentAssessmentMock.getQuantity).toHaveBeenCalledWith('s1');
    expect(component.stats()[2].value).toBe('4');
  });

  it('keeps the count at 0 when there is no logged-in user id', async () => {
    setup({ userName: 'eider_student', role: 'student' }, { userId: null });
    await flush();

    expect(studentAssessmentMock.getQuantity).not.toHaveBeenCalled();
    expect(component.stats()[2].value).toBe('0');
  });

  it('keeps the count at 0 when the request fails', async () => {
    setup(
      { userName: 'eider_student', role: 'student' },
      { userId: 's1', reject: new Error('Sin conexión al servidor') },
    );
    await flush();

    expect(component.stats()[2].value).toBe('0');
  });
});
