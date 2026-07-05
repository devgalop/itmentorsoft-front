import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

interface StatCard {
  label: string;
  hint: string;
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminDashboardComponent {
  // Estructura del mockup. Sin backend de métricas todavía → valores "sin datos".
  readonly stats: StatCard[] = [
    { label: 'Total usuarios', hint: 'Sin datos' },
    { label: 'Roles configurados', hint: 'Sin datos' },
    { label: 'Recursos activos', hint: 'Sin datos' },
    { label: 'Pendientes aprobación', hint: 'Sin datos' },
  ];
}
