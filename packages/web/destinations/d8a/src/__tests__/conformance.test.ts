import path from 'path';
import { conformance } from '@walkeros/collector/dev';
import { page } from '@walkeros/web-core/dev';
import { destinationD8a } from '..';
import { examples, schemas } from '../dev';

describe('d8a conformance', () => {
  beforeEach(() => {
    jest.useRealTimers();
  });

  it('conforms', async () => {
    await conformance('destination', destinationD8a, {
      profile: 'web-sdk',
      page,
      examples: examples.step,
      schema: schemas.settings,
      settings: {
        property_id: '80e1d6d0-560d-419f-ac2a-fe9281e93386',
        server_container_url:
          'https://global.t.d8a.tech/80e1d6d0-560d-419f-ac2a-fe9281e93386/d/c',
        send_page_view: true,
        debug_mode: false,
        cookie_domain: 'auto',
        cookie_path: '/',
        cookie_expires: 63072000,
        cookie_flags: 'SameSite=Lax',
        cookie_prefix: 'd8a_',
        cookie_update: true,
        session_timeout_ms: 1800000,
        session_engagement_time_sec: 10,
        flush_interval_ms: 1000,
        max_batch_size: 20,
        user_id: 'user-1',
        client_id: 'client-1',
        campaign_id: 'c1',
        campaign_source: 'newsletter',
        campaign_medium: 'email',
        campaign_name: 'spring',
        campaign_term: 'term',
        campaign_content: 'content',
        page_location: 'https://example.com/',
        page_title: 'Example',
        page_referrer: 'https://example.org/',
        content_group: 'docs',
        language: 'en',
        screen_resolution: '1920x1080',
        ignore_referrer: false,
        site_search_enabled: true,
        site_search_query_params: ['q'],
        outbound_clicks_enabled: true,
        outbound_exclude_domains: ['example.com'],
        file_downloads_enabled: true,
        file_download_extensions: ['pdf'],
      },
      minimal: examples.minimal,
      env: { push: examples.env.push, simulation: examples.env.simulation },
      // Forwarded whole into d8a('config', ...) by buildConfigParams
      passThrough: [
        'send_page_view',
        'debug_mode',
        'cookie_domain',
        'cookie_path',
        'cookie_expires',
        'cookie_flags',
        'cookie_prefix',
        'cookie_update',
        'session_timeout_ms',
        'session_engagement_time_sec',
        'flush_interval_ms',
        'max_batch_size',
        'user_id',
        'client_id',
        'campaign_id',
        'campaign_source',
        'campaign_medium',
        'campaign_name',
        'campaign_term',
        'campaign_content',
        'page_location',
        'page_title',
        'page_referrer',
        'content_group',
        'language',
        'screen_resolution',
        'ignore_referrer',
        'site_search_enabled',
        'site_search_query_params',
        'outbound_clicks_enabled',
        'outbound_exclude_domains',
        'file_downloads_enabled',
        'file_download_extensions',
      ],
      root: path.join(__dirname, '..', '..'),
    });
  });
});
