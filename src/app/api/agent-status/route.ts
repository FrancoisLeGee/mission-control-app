import { NextResponse } from "next/server";
import { listTasks, listActivity } from "@/lib/db";

function mapStatus(tasks: ReturnType<typeof listTasks>) {
  const inProgress = tasks.filter((t) => t.status === "in_progress").length;
  const review = tasks.filter((t) => t.status === "review").length;
  const done = tasks.filter((t) => t.status === "done").length;

  if (inProgress > 0) return { status: "working", tasksCompleted: done, reviewCount: review };
  return { status: "idle", tasksCompleted: done, reviewCount: review };
}

export async function GET() {
  try {
    const tasks = listTasks();
    const activity = listActivity({ limit: 12 });
    const current = tasks.find((t) => t.status === "in_progress")
      || tasks.find((t) => t.status === "review")
      || tasks.find((t) => t.status === "assigned")
      || tasks.find((t) => t.status === "inbox");

    const derived = mapStatus(tasks);

    const payload = {
      status: derived.status,
      currentTask: current?.title || "Bereit für Aufgaben",
      thought:
        derived.status === "working"
          ? "arbeite an der nächsten Aufgabe"
          : derived.reviewCount > 0
            ? "warte auf Review"
            : "bereit für neue Aufgaben",
      uptime: `Tasks: ${tasks.length}`,
      tasksCompleted: derived.tasksCompleted,
      lastUpdate: new Date().toISOString(),
      monitorText:
        derived.status === "working"
          ? "> status: working\n> queue active\n> processing tasks\n> awaiting next milestone"
          : "> status: idle\n> mission control online\n> waiting for next task",
      activities: activity.map((a) => ({
        time: new Date(a.created_at + "Z").toLocaleTimeString("de-DE", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        text: a.message,
      })),
    };

    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      {
        status: "offline",
        currentTask: "Mission Control API Fehler",
        thought: "db offline",
        uptime: "—",
        tasksCompleted: 0,
        lastUpdate: new Date().toISOString(),
        monitorText: "> status: offline\n> api error",
        activities: [
          {
            time: new Date().toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }),
            text: `API Fehler: ${String(error)}`,
          },
        ],
      },
      { status: 500 }
    );
  }
}
