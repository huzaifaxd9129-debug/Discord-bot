const {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  PermissionsBitField,
  ChannelType
} = require('discord.js');

const ms = require('ms');

const client = new Client({
  intents: Object.values(GatewayIntentBits),
  partials: Object.values(Partials)
});

const TOKEN = "YOUR_TOKEN";
const LOG_CHANNEL = "1500169350307647488";

let invites = new Map();
let economy = new Map();
let bank = new Map();
let ticketOwners = new Map();

// ================= READY =================
client.once('ready', async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  client.user.setActivity("Made By Huztro");

  const guild = client.guilds.cache.first();
  if (guild) {
    const data = await guild.invites.fetch();
    invites.set(guild.id, data);
  }
});

// ================= BIG WELCOME =================
client.on('guildMemberAdd', async member => {
  const embed = new EmbedBuilder()
    .setTitle("🎉 Welcome!")
    .setDescription(`> Welcome ${member} to **${member.guild.name}**\n> Enjoy your stay 🚀`)
    .setThumbnail(member.user.displayAvatarURL())
    .setColor("Green")
    .setFooter({ text: `Member #${member.guild.memberCount}` });

  member.guild.systemChannel?.send({ embeds: [embed] });
});

// ================= ADVANCED INVITE TRACK =================
client.on('guildMemberAdd', async member => {
  const newInvites = await member.guild.invites.fetch();
  const oldInvites = invites.get(member.guild.id);

  const invite = newInvites.find(i => i.uses > oldInvites?.get(i.code)?.uses);
  let inviter = invite ? invite.inviter.tag : "Unknown";

  member.guild.systemChannel?.send(`📥 ${member.user.tag} joined via **${inviter}**`);
  invites.set(member.guild.id, newInvites);
});

// ================= ANTI LINK =================
client.on('messageCreate', message => {
  if (message.author.bot) return;

  if (/(https?:\/\/|discord\.gg)/.test(message.content)) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
      message.delete().catch(() => {});
      message.channel.send(`🚫 ${message.author}, links are not allowed`)
        .then(m => setTimeout(() => m.delete(), 3000));
    }
  }
});

// ================= HELP PANEL =================
client.on('messageCreate', message => {
  if (message.content === '!help') {
    const embed = new EmbedBuilder()
      .setTitle("📘 Help Panel")
      .setDescription("Select a category below to view commands")
      .setColor("Blue");

    const menu = new StringSelectMenuBuilder()
      .setCustomId('help_menu')
      .setPlaceholder('Choose category...')
      .addOptions([
        { label: 'Moderation', value: 'mod' },
        { label: 'Economy', value: 'eco' },
        { label: 'Tickets', value: 'ticket' },
        { label: 'Staff', value: 'staff' }
      ]);

    const row = new ActionRowBuilder().addComponents(menu);
    message.channel.send({ embeds: [embed], components: [row] });
  }
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isStringSelectMenu()) return;

  const replies = {
    mod: "🔨 ban, kick, purge, timeout, warn...",
    eco: "💰 balance, daily, work...",
    ticket: "🎟️ Use panel to create tickets",
    staff: "📋 Apply via staff panel"
  };

  interaction.reply({ content: replies[interaction.values[0]], ephemeral: true });
});

// ================= TICKET PANEL =================
client.on('messageCreate', message => {
  if (message.content === '!panel') {
    const embed = new EmbedBuilder()
      .setTitle("🎟️ Support Center")
      .setDescription("Choose a category to open a ticket");

    const menu = new StringSelectMenuBuilder()
      .setCustomId('ticket_menu')
      .setPlaceholder('Select ticket type')
      .addOptions([
        { label: 'Support', value: 'support' },
        { label: 'Report', value: 'report' },
        { label: 'Bug', value: 'bug' }
      ]);

    const row = new ActionRowBuilder().addComponents(menu);
    message.channel.send({ embeds: [embed], components: [row] });
  }
});

// ================= STAFF PANEL =================
client.on('messageCreate', message => {
  if (message.content === '!applypanel') {
    const embed = new EmbedBuilder()
      .setTitle("🚀 Staff Application")
      .setDescription("Click below to apply");

    const btn = new ButtonBuilder()
      .setCustomId('apply_staff')
      .setLabel('Apply Now')
      .setStyle(ButtonStyle.Primary);

    message.channel.send({
      embeds: [embed],
      components: [new ActionRowBuilder().addComponents(btn)]
    });
  }
});

// ================= INTERACTIONS =================
client.on('interactionCreate', async interaction => {

  // ===== TICKET CREATE =====
  if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_menu') {
    const channel = await interaction.guild.channels.create({
      name: `ticket-${interaction.user.username}`,
      type: ChannelType.GuildText
    });

    ticketOwners.set(channel.id, interaction.user.id);

    await channel.permissionOverwrites.set([
      { id: interaction.guild.id, deny: ['ViewChannel'] },
      { id: interaction.user.id, allow: ['ViewChannel'] }
    ]);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('claim_ticket').setLabel('Claim').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('close_ticket').setLabel('Close').setStyle(ButtonStyle.Danger)
    );

    channel.send({ content: `Ticket for ${interaction.user}`, components: [row] });

    interaction.reply({ content: `✅ Ticket created: ${channel}`, ephemeral: true });

    const log = await client.channels.fetch(LOG_CHANNEL);
    log.send(`🎟️ Ticket opened by ${interaction.user.tag}`);
  }

  // ===== BUTTONS =====
  if (interaction.isButton()) {

    if (interaction.customId === 'close_ticket') {
      interaction.channel.delete();
      const log = await client.channels.fetch(LOG_CHANNEL);
      log.send(`❌ Ticket closed by ${interaction.user.tag}`);
    }

    if (interaction.customId === 'claim_ticket') {
      interaction.reply(`✅ Claimed by ${interaction.user}`);
    }

    // ===== STAFF APPLY =====
    if (interaction.customId === 'apply_staff') {
      const questions = [
        "Why staff?",
        "Experience?",
        "Age?",
        "Timezone?",
        "Activity?"
      ];

      await interaction.reply({ content: "📩 Check DMs", ephemeral: true });

      const dm = await interaction.user.createDM();
      let answers = [];

      for (let q of questions) {
        await dm.send(q);
        const collected = await dm.awaitMessages({
          filter: m => m.author.id === interaction.user.id,
          max: 1
        });
        answers.push(collected.first().content);
      }

      const embed = new EmbedBuilder()
        .setTitle("📋 Staff Application")
        .setDescription(`User: ${interaction.user.tag}\n\n${answers.join("\n")}`);

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`accept_${interaction.user.id}`).setLabel('Accept').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`reject_${interaction.user.id}`).setLabel('Reject').setStyle(ButtonStyle.Danger)
      );

      const log = await client.channels.fetch(LOG_CHANNEL);
      log.send({ embeds: [embed], components: [row] });
    }

    if (interaction.customId.startsWith("accept_")) {
      const id = interaction.customId.split("_")[1];
      interaction.reply(`✅ Accepted <@${id}>`);
    }

    if (interaction.customId.startsWith("reject_")) {
      const id = interaction.customId.split("_")[1];
      interaction.reply(`❌ Rejected <@${id}>`);
    }
  }
});

// ================= GIVEAWAY =================
client.on('messageCreate', async message => {
  if (!message.content.startsWith('!gstart')) return;

  const args = message.content.split(" ");
  const time = ms(args[1]);
  const prize = args.slice(2).join(" ");

  const msg = await message.channel.send(`🎉 ${prize}\nReact 🎉`);
  await msg.react('🎉');

  setTimeout(async () => {
    const users = await msg.reactions.cache.get('🎉').users.fetch();
    const winner = users.random();
    message.channel.send(`🏆 Winner: ${winner}`);
  }, time);
});

// ================= BASIC MOD =================
client.on('messageCreate', async message => {
  if (!message.content.startsWith('!')) return;

  const args = message.content.slice(1).split(" ");
  const cmd = args.shift();

  if (cmd === 'ban') {
    if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) return;
    message.mentions.members.first()?.ban();
  }

  if (cmd === 'kick') {
    if (!message.member.permissions.has(PermissionsBitField.Flags.KickMembers)) return;
    message.mentions.members.first()?.kick();
  }

  if (cmd === 'purge') {
    message.channel.bulkDelete(args[0]);
  }

  if (cmd === "nuke") {
  if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;

  const newChannel = await message.channel.clone();
  await message.channel.delete();
  newChannel.send("💥 Channel nuked");
}

  if (cmd === "clone") {
  const ch = await message.channel.clone();
  message.reply(`Cloned: ${ch}`);
}

  if (cmd === "lock") {
  if (!message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) return;

  message.channel.permissionOverwrites.edit(message.guild.roles.everyone, {
    SendMessages: false,
  });

  message.reply("🔒 Channel locked");
}

  if (cmd === "unlock") {
  if (!message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) return;

  message.channel.permissionOverwrites.edit(message.guild.roles.everyone, {
    SendMessages: true,
  });

  message.reply("🔓 Channel unlocked");
}

  if (cmd === "clearbots") {
  const messages = await message.channel.messages.fetch({ limit: 100 });
  const bots = messages.filter(m => m.author.bot);

  message.channel.bulkDelete(bots);
  message.reply("🤖 Bot messages cleared");
}

  if (cmd === "userinfo") {
  const user = message.mentions.members.first() || message.member;

  message.reply(`
👤 User: ${user.user.tag}
🆔 ID: ${user.id}
📅 Joined: ${user.joinedAt}
  `);
}

  if (cmd === "roleinfo") {
  const role = message.mentions.roles.first();
  if (!role) return message.reply("Mention a role");

  message.reply(`
🎭 Role: ${role.name}
👥 Members: ${role.members.size}
🎨 Color: ${role.hexColor}
  `);
}

  if (cmd === "avatar") {
  const user = message.mentions.users.first() || message.author;
  message.reply(user.displayAvatarURL({ size: 1024 }));
}

  if (cmd === "timeout") {
  if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) return;

  const user = message.mentions.members.first();
  const time = ms(args[1]);

  if (!user || !time) return message.reply("Usage: timeout @user 10m");

  await user.timeout(time);
  message.reply(`⏳ ${user.user.tag} timed out`);
}

  if (cmd === "untimeout") {
  const user = message.mentions.members.first();
  if (!user) return;

  await user.timeout(null);
  message.reply(`🔊 Timeout removed from ${user.user.tag}`);
}

  if (cmd === "softban") {
  const user = message.mentions.members.first();
  if (!user) return;

  await user.ban({ deleteMessageDays: 1 });
  await message.guild.members.unban(user.id);

  message.reply(`🧼 Softbanned ${user.user.tag}`);
}

  if (cmd === "nick") {
  const user = message.mentions.members.first();
  const nick = args.slice(1).join(" ");

  if (!user || !nick) return;

  user.setNickname(nick);
  message.reply(`✏️ Nickname changed`);
}

  if (cmd === "resetnick") {
  const user = message.mentions.members.first();
  if (!user) return;

  user.setNickname(null);
  message.reply(`♻️ Nick reset`);
}

  if (cmd === "slowmode") {
  const time = parseInt(args[0]);
  if (isNaN(time)) return;

  message.channel.setRateLimitPerUser(time);
  message.reply(`🐢 Slowmode set to ${time}s`);
}

  if (cmd === "hide") {
  message.channel.permissionOverwrites.edit(message.guild.roles.everyone, {
    ViewChannel: false
  });

  message.reply("👁️ Channel hidden");
}

  if (cmd === "unhide") {
  message.channel.permissionOverwrites.edit(message.guild.roles.everyone, {
    ViewChannel: true
  });

  message.reply("👀 Channel visible");
}

  if (cmd === "serverinfo") {
  message.reply(`
🏠 ${message.guild.name}
👥 Members: ${message.guild.memberCount}
📅 Created: ${message.guild.createdAt}
  `);
}

  if (cmd === "channelinfo") {
  message.reply(`
📺 ${message.channel.name}
🆔 ${message.channel.id}
📂 Type: ${message.channel.type}
  `);
}

  if (cmd === "invites") {
  const invites = await message.guild.invites.fetch();
  const user = message.author;

  const total = invites.filter(i => i.inviter?.id === user.id)
    .reduce((acc, i) => acc + i.uses, 0);

  message.reply(`📨 You have ${total} invites`);
}
});

// ================= ECONOMY =================
client.on('messageCreate', message => {
  if (!message.content.startsWith('!')) return;

  if (cmd === "balance") {
  const cash = economy.get(message.author.id) || 0;
  const bankBal = bank.get(message.author.id) || 0;

  message.reply(`💰 Wallet: ${cash} | 🏦 Bank: ${bankBal}`);
}

  if (cmd === "daily") {
  let cash = economy.get(message.author.id) || 0;

  cash += 200;
  economy.set(message.author.id, cash);

  message.reply("🎁 You received 200 coins");
}

  if (cmd === "weekly") {
  let cash = economy.get(message.author.id) || 0;

  cash += 1000;
  economy.set(message.author.id, cash);

  message.reply("📅 Weekly reward: 1000 coins");
}

  if (cmd === "work") {
  let earn = Math.floor(Math.random() * 300);
  let cash = economy.get(message.author.id) || 0;

  cash += earn;
  economy.set(message.author.id, cash);

  message.reply(`💼 You earned ${earn} coins`);
}

  if (cmd === "beg") {
  let earn = Math.floor(Math.random() * 100);
  let cash = economy.get(message.author.id) || 0;

  cash += earn;
  economy.set(message.author.id, cash);

  message.reply(`🤲 Someone gave you ${earn}`);
}

  if (cmd === "deposit") {
  let amount = args[0] === "all"
    ? economy.get(message.author.id) || 0
    : parseInt(args[0]);

  if (!amount) return;

  let cash = economy.get(message.author.id) || 0;
  let bankBal = bank.get(message.author.id) || 0;

  if (cash < amount) return message.reply("Not enough cash");

  economy.set(message.author.id, cash - amount);
  bank.set(message.author.id, bankBal + amount);

  message.reply(`🏦 Deposited ${amount}`);
}

  if (cmd === "withdraw") {
  let amount = parseInt(args[0]);
  if (!amount) return;

  let bankBal = bank.get(message.author.id) || 0;
  let cash = economy.get(message.author.id) || 0;

  if (bankBal < amount) return message.reply("Not enough bank");

  bank.set(message.author.id, bankBal - amount);
  economy.set(message.author.id, cash + amount);

  message.reply(`💸 Withdrawn ${amount}`);
}

  if (cmd === "gamble") {
  let amount = parseInt(args[0]);
  let cash = economy.get(message.author.id) || 0;

  if (!amount || cash < amount) return;

  let win = Math.random() > 0.5;

  if (win) {
    cash += amount;
    message.reply(`🎉 You won ${amount}`);
  } else {
    cash -= amount;
    message.reply(`💀 You lost ${amount}`);
  }

  economy.set(message.author.id, cash);
}

  if (cmd === "coinflip") {
  let amount = parseInt(args[0]);
  let cash = economy.get(message.author.id) || 0;

  if (!amount || cash < amount) return;

  let result = Math.random() > 0.5;

  if (result) {
    cash += amount;
    message.reply("🪙 You won!");
  } else {
    cash -= amount;
    message.reply("💀 You lost!");
  }

  economy.set(message.author.id, cash);
}

  if (cmd === "slots") {
  let symbols = ["🍒", "🍋", "🍉"];
  let roll = [
    symbols[Math.floor(Math.random() * symbols.length)],
    symbols[Math.floor(Math.random() * symbols.length)],
    symbols[Math.floor(Math.random() * symbols.length)]
  ];

  let cash = economy.get(message.author.id) || 0;

  if (roll[0] === roll[1] && roll[1] === roll[2]) {
    cash += 500;
    message.reply(`🎰 ${roll.join(" ")} | JACKPOT +500`);
  } else {
    cash -= 50;
    message.reply(`🎰 ${roll.join(" ")} | Lost 50`);
  }

  economy.set(message.author.id, cash);
}

  if (cmd === "leaderboard") {
  const top = [...economy.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  let text = top.map((u, i) => `#${i + 1} <@${u[0]}> - ${u[1]}`).join("\n");

  message.reply(`🏆 Top Users:\n${text}`);
}

  if (cmd === "shop") {
  message.reply(`
🛒 Shop:
1. VIP Role - 10000
2. Custom Role - 50000
  `);
}

  if (cmd === "buy") {
  let item = args[0];
  let cash = economy.get(message.author.id) || 0;

  if (item === "vip" && cash >= 1000) {
    economy.set(message.author.id, cash - 1000);
    message.reply("🎉 VIP purchased");
  }
}

  if (cmd === "addmoney") {
  if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;

  const user = message.mentions.users.first();
  const amount = parseInt(args[1]);

  if (!user || !amount) return;

  let bal = economy.get(user.id) || 0;
  economy.set(user.id, bal + amount);

  message.reply(`💰 Added ${amount} to ${user.tag}`);
}

  if (cmd === "pay") {
  const user = message.mentions.users.first();
  const amount = parseInt(args[1]);

  if (!user) return message.reply("❌ Mention a user to pay");
  if (!amount || amount <= 0) return message.reply("❌ Enter a valid amount");

  let senderBal = economy.get(message.author.id) || 0;
  let receiverBal = economy.get(user.id) || 0;

  if (senderBal < amount) {
    return message.reply("❌ You don't have enough money");
  }

  economy.set(message.author.id, senderBal - amount);
  economy.set(user.id, receiverBal + amount);

  message.reply(`💸 You paid **${amount} coins** to ${user.tag}`);
}
});

client.login(TOKEN);
