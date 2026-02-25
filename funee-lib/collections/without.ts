/**
 * Remove items from a list.
 * @param items The list to remove from
 * @param toRemove The list of items to remove
 * @returns The items list without the items in toRemove list
 */
export const without = (items: any[], toRemove: any[]) => {
  return items.filter((x: any) => !toRemove.includes(x));
};
