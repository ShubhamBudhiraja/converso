export function getPaginationMeta(
    page: number,
    pageSize: number,
    total: number,
) {
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
    const rangeEnd = total === 0 ? 0 : Math.min(page * pageSize, total);

    return { totalPages, rangeStart, rangeEnd };
}

export function formatShowingRange(
    page: number,
    pageSize: number,
    total: number,
): string {
    const { rangeStart, rangeEnd } = getPaginationMeta(page, pageSize, total);
    if (total === 0) return "Showing 0 of 0 items";
    return `Showing ${rangeStart}-${rangeEnd} of ${total} items`;
}
