import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { StudentDashboardComponent } from './student-dashboard.component';
import { AuthService } from '../../../core/auth/auth.service';

describe('StudentDashboardComponent', () => {
  let component: StudentDashboardComponent;
  let fixture: ComponentFixture<StudentDashboardComponent>;
  let authServiceMock: { user: ReturnType<typeof vi.fn> };

  function setup(user: { userName: string; role: string } | null): void {
    authServiceMock = { user: vi.fn(() => user) };

    TestBed.configureTestingModule({
      imports: [StudentDashboardComponent],
      providers: [provideRouter([]), { provide: AuthService, useValue: authServiceMock }],
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
});
