export function slicerKey(table: string | undefined, column: string, value: string) {
    return JSON.stringify([table ?? '', column, value]);
}
