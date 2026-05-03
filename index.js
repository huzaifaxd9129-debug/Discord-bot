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

const PREFIX = process.env.PREFIX || "+";

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

  if (cmd === "beg") {
  let amount = Math.floor(Math.random() * 200) + 1;
  let bal = await db.get(`bal_${message.author.id}`) || 0;

  await db.set(`bal_${message.author.id}`, bal + amount);
  message.reply(`You begged and got 💰 $${amount}`);
}

  if (cmd === "rob") {
  const user = message.mentions.users.first();
  if (!user) return message.reply("Mention someone to rob!");

  let targetBal = await db.get(`bal_${user.id}`) || 0;
  let robberBal = await db.get(`bal_${message.author.id}`) || 0;

  if (targetBal < 100) return message.reply("User is too poor to rob!");

  let stolen = Math.floor(Math.random() * targetBal);

  await db.set(`bal_${user.id}`, targetBal - stolen);
  await db.set(`bal_${message.author.id}`, robberBal + stolen);

  message.reply(`You robbed 💰 $${stolen} from ${user.username}`);
}

  if (cmd === "deposit") {
  let amount = parseInt(args[0]);
  let bal = await db.get(`bal_${message.author.id}`) || 0;

  if (!amount || bal < amount) return message.reply("Invalid amount");

  await db.set(`bal_${message.author.id}`, bal - amount);
  await db.add(`bank_${message.author.id}`, amount);

  message.reply(`Deposited 💰 $${amount} into bank`);
}

  if (cmd === "crime") {
  let success = Math.random() > 0.5;
  let bal = await db.get(`bal_${message.author.id}`) || 0;

  if (success) {
    let gain = Math.floor(Math.random() * 1000);
    await db.set(`bal_${message.author.id}`, bal + gain);
    message.reply(`🟢 Crime successful! +$${gain}`);
  } else {
    let loss = Math.floor(Math.random() * 500);
    await db.set(`bal_${message.author.id}`, bal - loss);
    message.reply(`🔴 Caught! -$${loss}`);
  }
}

  if (cmd === "coinflip") {
  let choice = args[0];
  let result = Math.random() < 0.5 ? "heads" : "tails";

  if (choice === result) {
    message.reply(`You won! It was ${result}`);
  } else {
    message.reply(`You lost! It was ${result}`);
  }
}

  if (cmd === "slots") {
  let amount = parseInt(args[0]);
  let bal = await db.get(`bal_${message.author.id}`) || 0;

  if (bal < amount) return message.reply("Not enough money");

  let emojis = ["🍒", "🍋", "🍉"];
  let result = emojis.sort(() => Math.random() - 0.5).slice(0, 3);

  let win = result[0] === result[1] && result[1] === result[2];

  if (win) {
    await db.set(`bal_${message.author.id}`, bal + amount);
    message.reply(`🎰 ${result.join(" ")} You won!`);
  } else {
    await db.set(`bal_${message.author.id}`, bal - amount);
    message.reply(`🎰 ${result.join(" ")} You lost!`);
  }
}

  if (cmd === "leaderboard") {
  let all = db.all().filter(d => d.id.startsWith("bal_"));

  all.sort((a, b) => b.value - a.value);

  let top = all.slice(0, 10);

  let msg = top.map((u, i) => `#${i + 1} <@${u.id.replace("bal_", "")}> - $${u.value}`).join("\n");

  message.channel.send("🏆 **Leaderboard**\n" + msg);
}

  if (cmd === "withdraw") {
  let amount = parseInt(args[0]);
  let bank = await db.get(`bank_${message.author.id}`) || 0;

  if (!amount || bank < amount) return message.reply("Not enough in bank");

  await db.set(`bank_${message.author.id}`, bank - amount);
  await db.add(`bal_${message.author.id}`, amount);

  message.reply(`Withdrew 💰 $${amount}`);
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
