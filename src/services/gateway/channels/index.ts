/**
 * Channel extension seam:
 * - Add a new channel plugin that implements ChannelPlugin<TConfig, TAccount>.
 * - Register it in gateway bootstrap alongside WhatsApp.
 * - Reuse the same manager lifecycle (start/stop/status) without changing core gateway flow.
 */
export * from '@/services/gateway/channels/types.js';
export * from '@/services/gateway/channels/manager.js';

