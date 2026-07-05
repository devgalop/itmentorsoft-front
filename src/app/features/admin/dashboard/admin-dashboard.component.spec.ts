import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AdminDashboardComponent } from './admin-dashboard.component';

describe('AdminDashboardComponent', () => {
  let component: AdminDashboardComponent;
  let fixture: ComponentFixture<AdminDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminDashboardComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('creates successfully', () => {
    expect(component).toBeTruthy();
  });

  it('renders the admin panel title', () => {
    const greeting = fixture.nativeElement.querySelector('.dash__greeting');
    expect(greeting?.textContent?.trim()).toBe('Panel de Administración');
  });

  it('renders four stat cards', () => {
    const stats = fixture.nativeElement.querySelectorAll('.dash__stat');
    expect(stats.length).toBe(4);
  });

  it('renders empty-state panels while there is no backend data', () => {
    const empties = fixture.nativeElement.querySelectorAll('.dash__empty');
    expect(empties.length).toBe(3);
  });
});
