/** Un dato de una gráfica de conteos: qué es, cuántos hay y de qué color se dibuja. */
export interface ChartItem {
  key: string;
  label: string;
  count: number;
  color: string;
}
