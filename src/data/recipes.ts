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
  /** One more question after the materials are paid: what the build itself does, in code. */
  finale?: { code: string[]; question: string; options: string[]; answer: string; explain: string }
}

/** Which recipe each map's build site uses. */
export const siteRecipe: Record<string, string> = { route1: 'bridge', route2: 'tower', hackroad: 'catapult' }

export const recipes: Record<string, Recipe> = {
  bridge: {
    id: 'bridge', name: 'Wooden Bridge', text: 'Planks of wood, tied together with fiber rope.',
    needs: [['wood', 3], ['fiber', 2]],
    where: { wood: 'Fallen logs give wood. The woods west of the path are full of them.', fiber: 'Reeds by the river give fiber.' },
  },
  tower: {
    id: 'tower', name: 'Climbing Tower', text: 'A wooden scaffold with stairs, tall enough to reach the top of the rock wall.',
    needs: [['wood', 6], ['fiber', 3]],
    where: { wood: 'Fallen logs give wood. Look in the woods and around the meadows.', fiber: 'Reeds by the pond give fiber.' },
    finale: {
      code: ['wood = 6', 'levels = wood / 2', 'print(levels)'],
      question: 'Each level of the tower uses 2 wood. What does this print?',
      options: ['3.0', '3', '12', '4'], answer: '3.0',
      explain: '/ always gives a decimal number: 6 / 2 is 3.0. Three levels, tall enough to reach the top!',
    },
  },
  catapult: {
    id: 'catapult', name: 'Catapult', text: 'It throws stones into the gate\'s counterweight basket. Heavy enough, and the gate goes up!',
    needs: [['wood', 4], ['stone', 4]],
    where: { wood: 'Fallen logs give wood. There are some along Hackathon Road.', stone: 'Rock piles give stone. Look near the big boulders.' },
    finale: {
      code: ['stones = 4', 'weight = stones * 5', 'print(weight >= 20)'],
      question: 'Each stone weighs 5 kg. The gate opens at 20 kg or more. What does this print?',
      options: ['True', 'False'], answer: 'True',
      explain: '4 * 5 is 20, and 20 >= 20 is True: >= counts the exact limit too. The gate will open!',
    },
  },
}
