import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TeacherDashboardComponent } from './teacher-dashboard.component';

describe('TeacherDashboardComponent', () => {
  let component: TeacherDashboardComponent;
  let fixture: ComponentFixture<TeacherDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TeacherDashboardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TeacherDashboardComponent);
    component = fixture.componentInstance;
  });

  it('creates successfully', () => {
    expect(component).toBeTruthy();
  });

  it('renders the placeholder title', () => {
    fixture.detectChanges();
    const title = fixture.nativeElement.querySelector('h1');
    expect(title?.textContent?.trim()).toBe('Dashboard Docente');
  });

  it('renders the placeholder description', () => {
    fixture.detectChanges();
    const description = fixture.nativeElement.querySelector('p');
    expect(description?.textContent).toContain('banco de preguntas');
  });
});
