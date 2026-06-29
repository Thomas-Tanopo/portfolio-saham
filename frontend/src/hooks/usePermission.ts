import { useAuthStore } from '../stores/authStore';

export function usePermission(modul: string) {
  const permissions = useAuthStore((s) => s.user?.permissions) ?? [];
  const perm = permissions.find((p) => p.modul === modul);
  return {
    view: perm?.view ?? false,
    create: perm?.create ?? false,
    create_with_approval: (perm as any)?.create_with_approval ?? false,
    create_without_approval: (perm as any)?.create_without_approval ?? false,
    edit: perm?.edit ?? false,
    delete: perm?.delete ?? false,
  };
}
