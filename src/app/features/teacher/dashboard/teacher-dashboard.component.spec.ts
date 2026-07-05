import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { TeacherDashboardComponent } from './teacher-dashboard.component';
import { AuthService } from '../../../core/auth/auth.service';

describe('TeacherDashboardComponent', () => {
  let component: TeacherDashboardComponent;
  let fixture: ComponentFixture<TeacherDashboardComponent>;
  let authServiceMock: { user: ReturnType<typeof vi.fn> };

  function setup(user: { userName: string; role: string } | null): void {
    authServiceMock = { user: vi.fn(() => user) };

    TestBed.configureTestingModule({
      imports: [TeacherDashboardComponent],
      providers: [provideRouter([]), { provide: AuthService, useValue: authServiceMock }],
    });

    fixture = TestBed.createComponent(TeacherDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('creates successfully', () => {
    setup({ userName: 'docente_test', role: 'teacher' });
    expect(component).toBeTruthy();
  });

  it('greets the user with their username from the JWT', () => {
    setup({ userName: 'docente_test', role: 'teacher' });
    const greeting = fixture.nativeElement.querySelector('.dash__greeting');
    expect(greeting?.textContent?.trim()).toBe('Hola, docente_test');
  });

  it('falls back to "Docente" when there is no user', () => {
    setup(null);
    expect(component.userName()).toBe('Docente');
  });

  it('renders four stat cards', () => {
    setup({ userName: 'docente_test', role: 'teacher' });
    const stats = fixture.nativeElement.querySelectorAll('.dash__stat');
    expect(stats.length).toBe(4);
  });

  it('renders empty-state panels while there is no backend data', () => {
    setup({ userName: 'docente_test', role: 'teacher' });
    const empties = fixture.nativeElement.querySelectorAll('.dash__empty');
    expect(empties.length).toBe(3);
  });
});
