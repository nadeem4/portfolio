import { ImageResponse } from 'next/og';
import { siteConfig } from '@/config/site';

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = 'image/png';

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'center',
          backgroundColor: '#ffffff',
          padding: '80px',
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            color: '#5a6066',
            fontSize: 32,
            fontFamily: 'monospace',
          }}
        >
          {siteConfig.role}
        </div>
        <div
          style={{
            display: 'flex',
            color: '#15181a',
            fontSize: 88,
            fontWeight: 600,
            marginTop: 24,
          }}
        >
          {siteConfig.name}
        </div>
        <div
          style={{
            display: 'flex',
            color: '#0c6a4c',
            fontSize: 34,
            marginTop: 28,
            maxWidth: 900,
          }}
        >
          {siteConfig.pitch}
        </div>
      </div>
    ),
    { ...size }
  );
}
