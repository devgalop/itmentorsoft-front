export interface NavItem {
  label: string;
  route: string;
  icon: string;
  /** Optional section header. Items sharing the same group render under it. */
  group?: string;
}
