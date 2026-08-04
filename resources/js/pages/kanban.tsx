import { Head } from "@inertiajs/react";
import { KanbanBoardPage } from "@/components/kanban/KanbanBoard";

export default function KanbanPage() {
    return (
        <>
            <Head title="Kanban — BACOVET" />
            <KanbanBoardPage />
        </>
    );
}
