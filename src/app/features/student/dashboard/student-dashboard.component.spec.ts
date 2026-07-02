import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StudentDashboardComponent } from './student-dashboard.component';

describe('StudentDashboardComponent', () => {
  let component: StudentDashboardComponent;
  let fixture: ComponentFixture<StudentDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StudentDashboardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(StudentDashboardComponent);
    component = fixture.componentInstance;
  });

  it('creates successfully', () => {
    expect(component).toBeTruthy();
  });

  it('renders the placeholder title', () => {
    fixture.detectChanges();
    const title = fixture.nativeElement.querySelector('h1');
    expect(title?.textContent?.trim()).toBe('Dashboard Estudiante');
  });

  it('renders the placeholder description', () => {
    fixture.detectChanges();
    const description = fixture.nativeElement.querySelector('p');
    expect(description?.textContent).toContain('evaluación inicial');
  });
});