// Things the player builds from gathered materials. Each build is checked and paid for in Python
// at the Maker Bench: the bag becomes variables, and the code decides if there is enough.

export interface Recipe {
  id: string
  name: string
  /** Materials and how many of each, in the order the bench checks them. */
  needs: Array<[string, number]>
  text: string
  /** Where to find the materials, said when something is missing. */
  where: Record<string, string>
}

export const recipes: Record<string, Recipe> = {
  bridge: {
    id: 'bridge', name: 'Wooden Bridge', text: 'Planks of wood, tied together with fiber rope.',
    needs: [['wood', 3], ['fiber', 2]],
    where: { wood: 'Fallen logs give wood. The woods west of the path are full of them.', fiber: 'Reeds by the river give fiber.' },
  },
}
