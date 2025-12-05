import { IrtActor } from "./module/documents/actor.mjs";
import { IrtItem } from "./module/documents/item.mjs";
import { IrtActorSheet } from "./module/sheets/actor-sheet.mjs";
import { IrtItemSheet } from "./module/sheets/item-sheet.mjs";

Hooks.once('init', async function() {

  game.irt = {
    IrtActor,
    IrtItem,
    rollItemMacro
  };

  /**
   * Set an initiative formula for the system
   * @type {String}
   */
  CONFIG.Combat.initiative = {
    formula: "1d12 + @attributes.strid.value",
    decimals: 2
  };

  // Define custom Document classes
  CONFIG.Actor.documentClass = IrtActor;
  CONFIG.Item.documentClass = IrtItem;

  // Register sheet application classes
  Actors.unregisterSheet("core", ActorSheet);
  Actors.registerSheet("irt", IrtActorSheet, { makeDefault: true });
  Items.unregisterSheet("core", ItemSheet);
  Items.registerSheet("irt", IrtItemSheet, { makeDefault: true });

  // Preload Handlebars templates.
  return preloadHandlebarsTemplates();
});

/**
 * Define a set of template paths to pre-load
 * Pre-loaded templates are compiled and cached for fast access when rendering
 * @return {Promise}
 */
async function preloadHandlebarsTemplates() {
  return loadTemplates([
    // "systems/irt/templates/actor/parts/actor-features.hbs",
    // "systems/irt/templates/actor/parts/actor-items.hbs",
    // "systems/irt/templates/actor/parts/actor-spells.hbs",
    // "systems/irt/templates/actor/parts/actor-effects.hbs"
  ]);
}

/* -------------------------------------------- */
/*  Hotbar Macros                               */
/* -------------------------------------------- */

/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param {Object} data     The dropped data
 * @param {number} slot     The hotbar slot to use
 * @returns {Promise}
 */
async function createItemMacro(data, slot) {
  if (data.type !== "Item") return;
  if (!("uuid" in data)) return ui.notifications.warn("You can only create macro buttons for owned Items");
  const item = await fromUuid(data.uuid);
  if (item.compendium) return ui.notifications.warn("You can only create macro buttons for owned Items");

  const command = `game.irt.rollItemMacro("${item.name}");`;
  let macro = game.macros.find(m => (m.name === item.name) && (m.command === command));
  if (!macro) {
    macro = await Macro.create({
      name: item.name,
      type: "script",
      img: item.img,
      command: command,
      flags: { "irt.itemMacro": true }
    });
  }
  game.user.assignHotbarMacro(macro, slot);
  return false;
}

/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param {string} itemName
 * @return {Promise}
 */
function rollItemMacro(itemName) {
  const speaker = ChatMessage.getSpeaker();
  let actor;
  if (speaker.token) actor = game.actors.tokens[speaker.token];
  if (!actor) actor = game.actors.get(speaker.actor);
  const item = actor ? actor.items.find(i => i.name === itemName) : null;
  if (!item) return ui.notifications.warn(`Your controlled Actor does not have an item named ${itemName}`);

  // Trigger the item roll
  return item.roll();
}

Hooks.once("ready", async function() {
  // Wait to register hotbar drop hook on ready so that modules could register earlier if they want to
  Hooks.on("hotbarDrop", (bar, data, slot) => createItemMacro(data, slot));
});
