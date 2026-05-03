require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionsBitField,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActivityType,
} = require("discord.js");

const ms = require("ms");
const { QuickDB } = require("quick.db");
const db = new QuickDB();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel],
});

const PREFIX = process.env.PREFIX || "?";

/* ===================== READY ===================== */
client.once("ready", () => {
  console.log(`${client.user.tag} is Online`);

  client.user.setActivity("Made By Huztro 💎", {
    type: ActivityType.Playing,
  });
});

/* ===================== WELCOME SYSTEM ===================== */
client.on("guildMemberAdd", async (member) => {
  const channel = member.guild.systemChannel;
  if (!channel) return;

  const embed = new EmbedBuilder()
    .setTitle("👋 Welcome!")
    .setDescription(`Welcome ${member} to **${member.guild.name}**`)
    .setColor("Green");

  channel.send({ embeds: [embed] });
});

/* ===================== ANTILINK ===================== */
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  const anti = await db.get(`antilink_${message.guild.id}`);
  if (anti) {
    if (message.content.includes("http")) {
      if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        message.delete();
        message.channel.send(`${message.author}, Links are not allowed!`);
      }
    }
  }

  if (!message.content.startsWith(PREFIX)) return;
  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const cmd = args.shift().toLowerCase();

  /* ===================== MODERATION ===================== */

  if (cmd === "ban") {
    const user = message.mentions.members.first();
    if (!user) return message.reply("Mention a user");
    await user.ban();
    message.reply("User Banned");
  }

  if (cmd === "unban") {
    const id = args[0];
    await message.guild.members.unban(id);
    message.reply("User Unbanned");
  }

  if (cmd === "kick") {
    const user = message.mentions.members.first();
    if (!user) return;
    await user.kick();
    message.reply("Kicked");
  }

  if (cmd === "clear") {
    const amount = args[0];
    await message.channel.bulkDelete(amount);
  }

  if (cmd === "mute") {
    const user = message.mentions.members.first();
    const time = args[1];
    await user.timeout(ms(time));
    message.reply("Muted");
  }

  if (cmd === "unmute") {
    const user = message.mentions.members.first();
    await user.timeout(null);
  }

  if (cmd === "warn") {
    const user = message.mentions.user;
    let warns = await db.get(`warns_${user.id}`) || 0;
    await db.set(`warns_${user.id}`, warns + 1);
    message.reply("Warned");
  }

  if (cmd === "antilink") {
    await db.set(`antilink_${message.guild.id}`, true);
    message.reply("AntiLink Enabled");
  }

  if (cmd === "antilinkoff") {
    await db.delete(`antilink_${message.guild.id}`);
    message.reply("Disabled");
  }

  if (cmd === "lock") {
    message.channel.permissionOverwrites.edit(message.guild.roles.everyone, {
      SendMessages: false,
    });
  }

  if (cmd === "unlock") {
    message.channel.permissionOverwrites.edit(message.guild.roles.everyone, {
      SendMessages: true,
    });
  }

  if (cmd === "avatar") {
    const user = message.mentions.users.first() || message.author;
    message.reply(user.displayAvatarURL());
  }

  if (cmd === "userinfo") {
    const user = message.mentions.members.first() || message.member;
    const embed = new EmbedBuilder()
      .setTitle(user.user.username)
      .setDescription(`ID: ${user.id}`);
    message.channel.send({ embeds: [embed] });
  }

  if (cmd === "serverinfo") {
    message.reply(`Server: ${message.guild.name}`);
  }

  /* ===================== ECONOMY ===================== */

  if (cmd === "balance") {
    let bal = await db.get(`bal_${message.author.id}`) || 0;
    message.reply(`Balance: $${bal}`);
  }

  if (cmd === "daily") {
    let bal = await db.get(`bal_${message.author.id}`) || 0;
    await db.set(`bal_${message.author.id}`, bal + 500);
    message.reply("Daily claimed $500");
  }

  if (cmd === "work") {
    let bal = await db.get(`bal_${message.author.id}`) || 0;
    await db.set(`bal_${message.author.id}`, bal + 200);
    message.reply("You worked and earned $200");
  }

  if (cmd === "pay") {
    const user = message.mentions.users.first();
    const amount = parseInt(args[1]);
    let bal = await db.get(`bal_${message.author.id}`) || 0;

    if (bal < amount) return message.reply("No money");

    await db.set(`bal_${message.author.id}`, bal - amount);
    await db.add(`bal_${user.id}`, amount);

    message.reply("Paid successfully");
  }

  /* (add more eco like beg, crime, rob, leaderboard etc similarly) */
});

/* ===================== TICKET SYSTEM ===================== */
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isButton()) return;

  if (interaction.customId === "ticket") {
    const channel = await interaction.guild.channels.create({
      name: `ticket-${interaction.user.username}`,
      type: ChannelType.GuildText,
    });

    channel.send("Support will be with you soon.");
    interaction.reply({ content: "Ticket Created", ephemeral: true });
  }

  if (interaction.customId === "close") {
    interaction.channel.delete();
  }

  if (interaction.customId === "apply") {
    const modal = new ModalBuilder()
      .setCustomId("applyForm")
      .setTitle("Staff Application");

    const q1 = new TextInputBuilder()
      .setCustomId("q1")
      .setLabel("Why join staff?")
      .setStyle(TextInputStyle.Paragraph);

    const row = new ActionRowBuilder().addComponents(q1);
    modal.addComponents(row);

    await interaction.showModal(modal);
  }
});

/* ===================== APPLY FORM ===================== */
client.on("interactionCreate", async (i) => {
  if (!i.isModalSubmit()) return;

  if (i.customId === "applyForm") {
    const answer = i.fields.getTextInputValue("q1");

    i.reply({ content: "Application submitted!", ephemeral: true });

    const log = i.guild.channels.cache.find(c => c.name === "apply-log");
    if (log) log.send(`New Apply: ${answer}`);
  }
});

/* ===================== HELP PANEL ===================== */
client.on("messageCreate", (message) => {
  if (message.content === PREFIX + "help") {
    const embed = new EmbedBuilder()
      .setTitle("Help Panel")
      .setDescription(`
Moderation: ban, kick, mute, warn
Economy: balance, daily, work
Systems: ticket, apply, antilink
      `)
      .setFooter({ text: "👑 Made By Huztro " });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("ticket")
        .setLabel("Create Ticket")
        .setStyle(ButtonStyle.Primary),

      new ButtonBuilder()
        .setCustomId("apply")
        .setLabel("Apply Staff")
        .setStyle(ButtonStyle.Success)
    );

    message.channel.send({ embeds: [embed], components: [row] });
  }
});

/* ===================== LOGIN ===================== */
client.login(process.env.TOKEN);
