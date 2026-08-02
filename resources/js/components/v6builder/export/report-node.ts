let reportNode: HTMLElement | null = null;

/** The Canvas registers its content div here so exports can capture it. */
export function registerReportNode(node: HTMLElement | null): void {
  reportNode = node;
}

export function getReportNode(): HTMLElement | null {
  return reportNode;
}

/** Widget wrapper elements (in DOM order) inside the captured report node. */
export function widgetNodes(node: HTMLElement): HTMLElement[] {
  return Array.from(node.querySelectorAll<HTMLElement>("[data-widget-id]"));
}
