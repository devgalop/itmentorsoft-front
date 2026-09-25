import { TestBed } from '@angular/core/testing';
import { SidebarService } from './sidebar.service';

describe('SidebarService', () => {
  let service: SidebarService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SidebarService);
  });

  it('starts collapsed', () => {
    expect(service.isCollapsed()).toBe(true);
  });

  it('toggle expands a collapsed sidebar', () => {
    service.toggle();
    expect(service.isCollapsed()).toBe(false);
  });

  it('toggle collapses it again', () => {
    service.toggle();
    service.toggle();
    expect(service.isCollapsed()).toBe(true);
  });
});
