import { Events, type Interaction, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } from 'discord.js';
import { activeChallenges } from '../../lib/utils.js';

export const name = Events.InteractionCreate;

export async function execute(interaction: Interaction) {
  try {
    // ── Slash Commands ──
    if (interaction.isChatInputCommand()) {
      const command = interaction.client.commands.get(interaction.commandName);
      if (!command) {
        console.error(`[WARN] No command matching: ${interaction.commandName}`);
        return;
      }

      await command.execute(interaction);
      return;
    }

    // ── Button Interactions ──
    if (interaction.isButton()) {
      const customId = interaction.customId;

      if (customId === 'btn_submit') {
        // Show code submission modal
        const activeChallenge = activeChallenges.get(interaction.user.id);
        if (!activeChallenge) {
          await interaction.reply({
            content: '❌ Kamu belum mengambil soal. Gunakan `/challenge` dulu.',
            ephemeral: true,
          });
          return;
        }

        const modal = new ModalBuilder()
          .setCustomId('modal_submit')
          .setTitle('Submit Solusi');

        const languageInput = new TextInputBuilder()
          .setCustomId('submit_language')
          .setLabel('Bahasa (python / javascript)')
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMaxLength(20)
          .setPlaceholder('python');

        const codeInput = new TextInputBuilder()
          .setCustomId('submit_code')
          .setLabel('Kode Solusi')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
          .setMaxLength(5000)
          .setPlaceholder('def solve(...):\n    # your code here');

        modal.addComponents(
          new ActionRowBuilder<TextInputBuilder>().addComponents(languageInput),
          new ActionRowBuilder<TextInputBuilder>().addComponents(codeInput),
        );

        await interaction.showModal(modal);
        return;
      }

      if (customId === 'btn_hint') {
        // Delegate to hint logic
        const hintCommand = interaction.client.commands.get('hint');
        if (hintCommand) {
          // Create a pseudo-interaction for hint
          await (hintCommand as any).executeButton(interaction);
        }
        return;
      }

      if (customId === 'btn_skip') {
        const had = activeChallenges.delete(interaction.user.id);
        await interaction.reply({
          content: had
            ? '⏭️ Challenge di-skip. Gunakan `/challenge` untuk mengambil soal baru.'
            : '❌ Tidak ada challenge aktif.',
          ephemeral: true,
        });
        return;
      }
    }

    // ── Modal Submissions ──
    if (interaction.isModalSubmit()) {
      if (interaction.customId === 'modal_submit') {
        // Delegate to submit command's modal handler
        const submitCommand = interaction.client.commands.get('submit');
        if (submitCommand) {
          await (submitCommand as any).executeModal(interaction);
        }
        return;
      }
    }
  } catch (error) {
    console.error(`[ERROR] Interaction handler:`, error);

    const errorReply = {
      content: '❌ Terjadi error saat memproses command. Silakan coba lagi.',
      ephemeral: true,
    };

    try {
      if (interaction.isRepliable()) {
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(errorReply);
        } else {
          await interaction.reply(errorReply);
        }
      }
    } catch (replyError) {
      console.error('[ERROR] Could not send error reply:', replyError);
    }
  }
}
