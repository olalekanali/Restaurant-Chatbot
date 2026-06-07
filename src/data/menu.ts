import { MenuItem } from "../models/MenuItem";

/** The restaurant's menu. Edit freely to change what the bot offers. */
export const MENU = [
  {
    name: "Jollof Rice",
    description: "Smoky party-style jollof with mixed veg.",
    emoji: "🍚",
    sortIndex: 1,
    options: [
      { label: "Regular", price: 1500 },
      { label: "Large", price: 2500 },
    ],
  },
  {
    name: "Fried Rice",
    description: "Wok-fried rice with liver, peas & carrots.",
    emoji: "🍛",
    sortIndex: 2,
    options: [
      { label: "Regular", price: 1600 },
      { label: "Large", price: 2600 },
    ],
  },
  {
    name: "Pounded Yam & Egusi",
    description: "Smooth pounded yam with melon-seed soup.",
    emoji: "🥣",
    sortIndex: 3,
    options: [
      { label: "Single", price: 2000 },
      { label: "Double", price: 3500 },
    ],
  },
  {
    name: "Suya",
    description: "Spicy grilled beef skewers with yaji.",
    emoji: "🍢",
    sortIndex: 4,
    options: [
      { label: "Small", price: 1000 },
      { label: "Large", price: 2000 },
    ],
  },
  {
    name: "Catfish Pepper Soup",
    description: "Peppery broth with fresh catfish & scent leaf.",
    emoji: "🐟",
    sortIndex: 5,
    options: [{ label: "Bowl", price: 2500 }],
  },
  {
    name: "Grilled Chicken",
    description: "Char-grilled chicken in suya rub.",
    emoji: "🍗",
    sortIndex: 6,
    options: [
      { label: "Quarter", price: 1800 },
      { label: "Half", price: 3200 },
    ],
  },
  {
    name: "Moi Moi",
    description: "Steamed bean pudding wrapped in leaves.",
    emoji: "🫘",
    sortIndex: 7,
    options: [{ label: "Wrap", price: 700 }],
  },
  {
    name: "Chapman",
    description: "Classic Nigerian cocktail mocktail.",
    emoji: "🍹",
    sortIndex: 8,
    options: [{ label: "Glass", price: 1200 }],
  },
  {
    name: "Zobo",
    description: "Chilled hibiscus drink with ginger.",
    emoji: "🥤",
    sortIndex: 9,
    options: [{ label: "Bottle", price: 800 }],
  },
];

/** Insert the menu only if the collection is empty. Safe to call on boot. */
export async function seedMenuIfEmpty(): Promise<void> {
  const count = await MenuItem.countDocuments();
  if (count === 0) {
    await MenuItem.insertMany(MENU);
    console.log(`🌱 Seeded ${MENU.length} menu items`);
  }
}
