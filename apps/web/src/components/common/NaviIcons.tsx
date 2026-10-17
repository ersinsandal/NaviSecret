import type { SVGProps } from 'react';

export interface NaviIconProps extends SVGProps<SVGSVGElement> {
  size?: number | string;
  color?: string;
  className?: string;
}

/**
 * NaviSecret Bespoke Cyber-Geographic SVG Icon System
 * Author & Designer: Ersin Sandal (SliferSoft)
 * 100% original, handcrafted geometric vector graphics. Zero emoji dependencies.
 */
export const NaviIcon = {
  // 1. Tactical Map Beacon
  Map: ({ size = 20, color = 'currentColor', className = '', ...props }: NaviIconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
      <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
      <line x1="9" y1="3" x2="9" y2="18" />
      <line x1="15" y1="6" x2="15" y2="21" />
      <circle cx="12" cy="11" r="2" fill={color} stroke="none" />
    </svg>
  ),

  // 2. Pulse ⚡ Proximity Radar
  Pulse: ({ size = 20, color = 'currentColor', className = '', ...props }: NaviIconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
      <circle cx="12" cy="12" r="1.5" fill={color} />
    </svg>
  ),

  // 3. Capsule 🎁 Secret Cryptographic Vault
  Capsule: ({ size = 20, color = 'currentColor', className = '', ...props }: NaviIconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      <path d="m3.3 7 8.7 5 8.7-5" />
      <path d="M12 22V12" />
      <circle cx="12" cy="9" r="1.5" fill={color} />
    </svg>
  ),

  // 4. Casper Mode 👻 Cyber Stealth Cloak
  Casper: ({ size = 20, color = 'currentColor', className = '', ...props }: NaviIconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
      <path d="M9 10h.01M15 10h.01" strokeWidth="2.5" />
      <path d="M12 2a8 8 0 0 0-8 8v10c0 .6.4 1 1 1 1.2 0 2-1 3-1s1.8 1 3 1 1.8-1 3-1 1.8 1 3 1 2-1 3-1c.6 0 1-.4 1-1V10a8 8 0 0 0-8-8z" />
      <path d="M9 15c1 1 3 1 4 0" />
    </svg>
  ),

  // 5. Footprint 👣 Bioluminescent Movement Trails
  Footprint: ({ size = 20, color = 'currentColor', className = '', ...props }: NaviIconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
      <path d="M4 16v-2.38C4 11.5 5.79 9.8 8 9.8c1.3 0 2.5.6 3.2 1.6l.8 1.1c.5.7 1.3 1.1 2.2 1.1h1.8c2.2 0 4 1.8 4 4v2.4" />
      <circle cx="6" cy="18" r="2" fill={color} stroke="none" />
      <circle cx="18" cy="18" r="2" fill={color} stroke="none" />
      <circle cx="12" cy="6" r="2.5" />
    </svg>
  ),

  // 6. World Unveil 🌍 Planetary Exploration Veil
  WorldUnveil: ({ size = 20, color = 'currentColor', className = '', ...props }: NaviIconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
      <path d="M2 12h20" />
      <path d="M4.93 4.93 19.07 19.07" strokeDasharray="2 3" />
    </svg>
  ),

  // 7. ZeroProof 🛡️ Cryptographic ZKP Shield
  ZeroProof: ({ size = 20, color = 'currentColor', className = '', ...props }: NaviIconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <circle cx="12" cy="10.5" r="2" fill={color} />
      <path d="M12 12.5v3" strokeWidth="2" />
    </svg>
  ),

  // 8. Nexus ❖ Quantum Rotating Star
  Nexus: ({ size = 20, color = 'currentColor', className = '', ...props }: NaviIconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
      <polygon points="12 2 15 9 22 12 15 15 12 22 9 15 2 12 9 9" />
      <circle cx="12" cy="12" r="2.5" fill={color} />
    </svg>
  ),

  // 9. Peer Social Network
  Friends: ({ size = 20, color = 'currentColor', className = '', ...props }: NaviIconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),

  // 10. Chat & Encrypted Frequencies
  Chat: ({ size = 20, color = 'currentColor', className = '', ...props }: NaviIconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      <line x1="8" y1="10" x2="16" y2="10" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),

  // 11. Tactical Cockpit Settings
  Settings: ({ size = 20, color = 'currentColor', className = '', ...props }: NaviIconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),

  // 12. Search Omnibar Crosshair
  Search: ({ size = 20, color = 'currentColor', className = '', ...props }: NaviIconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
      <circle cx="11" cy="11" r="3" strokeDasharray="2 2" strokeWidth="1.2" />
    </svg>
  ),

  // 13. Radar 360° Sweep
  Radar: ({ size = 20, color = 'currentColor', className = '', ...props }: NaviIconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" strokeDasharray="3 3" />
      <circle cx="12" cy="12" r="2" fill={color} />
      <line x1="12" y1="12" x2="19" y2="5" strokeWidth="2" />
    </svg>
  ),

  // 14. Location Anchor Pin
  Pin: ({ size = 20, color = 'currentColor', className = '', ...props }: NaviIconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" fill={color} stroke="none" />
    </svg>
  ),

  // 15. Notification Orb
  Bell: ({ size = 20, color = 'currentColor', className = '', ...props }: NaviIconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  ),

  // 16. Geometric Close
  Close: ({ size = 20, color = 'currentColor', className = '', ...props }: NaviIconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  ),

  // 17. Telemetry Delivery Craft
  Send: ({ size = 20, color = 'currentColor', className = '', ...props }: NaviIconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
      <path d="m22 2-7 20-4-9-9-4Z" />
      <path d="M22 2 11 13" />
    </svg>
  ),

  // 18. Verification Checks
  DoubleCheck: ({ size = 20, color = 'currentColor', className = '', ...props }: NaviIconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
      <path d="m18 6-8.5 9-3.5-3.5" />
      <path d="m22 10-8.5 9-1.5-1.5" />
    </svg>
  ),

  // 19. Tactical Compass
  Compass: ({ size = 20, color = 'currentColor', className = '', ...props }: NaviIconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
      <circle cx="12" cy="12" r="10" />
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" fill={color} />
    </svg>
  ),

  // 20. Brand Glyph (Hexagonal Energy Core)
  BrandGlyph: ({ size = 24, color = '#00F5B8', className = '', ...props }: NaviIconProps) => (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className} {...props}>
      <polygon points="16 2 29 9.5 29 22.5 16 30 3 22.5 3 9.5" stroke={color} strokeWidth="2.2" strokeLinejoin="round" fill="rgba(0, 245, 184, 0.08)" />
      <path d="M11 21V11l10 10V11" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="16" cy="16" r="2" fill="#8B5CF6" />
    </svg>
  ),

  // 21. User Profile Node
  Profile: ({ size = 20, color = 'currentColor', className = '', ...props }: NaviIconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
      <circle cx="12" cy="8" r="5" />
      <path d="M20 21a8 8 0 0 0-16 0" />
    </svg>
  ),

  // 22. Map Layers Switcher
  Layers: ({ size = 20, color = 'currentColor', className = '', ...props }: NaviIconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  ),
};
