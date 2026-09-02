const { PermissionFlagsBits } = require('discord.js');

function canModerate(actor, target) {
  if (!actor || !target) return false;
  if (target.id === actor.id) return false;
  if (target.id === actor.guild.ownerId) return false;
  if (actor.id === actor.guild.ownerId) return true;
  return actor.roles.highest.comparePositionTo(target.roles.highest) > 0;
}

function canBotModerate(guildMember) {
  return guildMember && guildMember.manageable;
}

function hasPermission(member, permission) {
  return member.permissions.has(permission);
}

module.exports = { canModerate, canBotModerate, hasPermission, PermissionFlagsBits };
