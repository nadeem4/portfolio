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
          backgroundColor: '#0b0f14',
          padding: '80px',
          fontFamily: 'monospace',
        }}
      >
        <div
          style={{
            display: 'flex',
            color: '#e8a33d',
            fontSize: 40,
          }}
        >
          &gt; whoami
        </div>
        <div
          style={{
            display: 'flex',
            color: '#e8a33d',
            fontSize: 72,
            fontWeight: 700,
            marginTop: 24,
          }}
        >
          {siteConfig.name}
        </div>
        <div
          style={{
            display: 'flex',
            color: '#8b93a0',
            fontSize: 32,
            marginTop: 20,
          }}
        >
          {siteConfig.role}
        </div>
      </div>
    ),
    { ...size }
  );
}
