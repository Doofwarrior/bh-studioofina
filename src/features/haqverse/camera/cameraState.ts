import { HaqVerseCameraMovementSchema } from "../domain/schemas";
import type { HaqVerseCameraMovement } from "../domain/types";

function keyFor(projectId: string) {
  return `qah:haqverse:${projectId}:camera-library`;
}

export function loadCameraMovements(projectId: string): HaqVerseCameraMovement[] {
  try {
    const raw = localStorage.getItem(keyFor(projectId));
    if (!raw) return [];
    const parsed = HaqVerseCameraMovementSchema.array().safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}

export function saveCameraMovements(projectId: string, movements: HaqVerseCameraMovement[]) {
  localStorage.setItem(keyFor(projectId), JSON.stringify(movements));
}
