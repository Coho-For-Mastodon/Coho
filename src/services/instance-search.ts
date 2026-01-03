import type { AutocompleteOption } from '../components/md/md-autocomplete';

// Popular Mastodon instances for fallback/initial suggestions
export const POPULAR_INSTANCES: AutocompleteOption[] = [
  {
    value: 'mastodon.social',
    label: 'mastodon.social',
    description: 'The original Mastodon server',
  },
  {
    value: 'mastodon.online',
    label: 'mastodon.online',
    description: 'A newer official Mastodon server',
  },
  {
    value: 'mstdn.social',
    label: 'mstdn.social',
    description: 'A general-purpose server',
  },
  {
    value: 'fosstodon.org',
    label: 'fosstodon.org',
    description: 'For Free & Open Source Software enthusiasts',
  },
  {
    value: 'hachyderm.io',
    label: 'hachyderm.io',
    description: 'For tech industry professionals',
  },
  {
    value: 'infosec.exchange',
    label: 'infosec.exchange',
    description: 'For the infosec community',
  },
  {
    value: 'tech.lgbt',
    label: 'tech.lgbt',
    description: 'For LGBTQ+ people in tech',
  },
  {
    value: 'universeodon.com',
    label: 'universeodon.com',
    description: 'A general-purpose server',
  },
  { value: 'mas.to', label: 'mas.to', description: 'A general-purpose server' },
  {
    value: 'social.vivaldi.net',
    label: 'social.vivaldi.net',
    description: 'Vivaldi browser community',
  },
];

interface InstanceResult {
  name: string;
  users?: number;
  thumbnail?: string;
  info?: {
    short_description?: string;
    full_description?: string;
  };
}

export async function searchInstances(
  query: string
): Promise<AutocompleteOption[]> {
  // First, filter popular instances that match
  const matchingPopular = POPULAR_INSTANCES.filter((inst) =>
    inst.value.toLowerCase().includes(query.toLowerCase())
  );

  // Try to fetch from instances.social API
  const instancesToken = import.meta.env.VITE_INSTANCES_SOCIAL_TOKEN;
  if (!instancesToken) {
    console.warn(
      'VITE_INSTANCES_SOCIAL_TOKEN not set, using local filtering only'
    );
    return matchingPopular.length > 0 ? matchingPopular : POPULAR_INSTANCES;
  }

  try {
    const response = await fetch(
      `https://instances.social/api/1.0/instances/search?q=${encodeURIComponent(query)}&count=10&name=true`,
      {
        headers: {
          Authorization: `Bearer ${instancesToken}`,
        },
      }
    );

    if (response.ok) {
      const data = await response.json();
      const apiInstances: AutocompleteOption[] = (
        (data.instances || []) as InstanceResult[]
      ).map((inst) => ({
        value: inst.name,
        label: inst.name,
        description:
          inst.info?.short_description ||
          inst.info?.full_description?.substring(0, 100) ||
          `${inst.users || '?'} users`,
        icon: inst.thumbnail,
      }));

      // Combine popular matches with API results, removing duplicates
      const seenValues = new Set<string>();
      const combined: AutocompleteOption[] = [];

      for (const inst of [...matchingPopular, ...apiInstances]) {
        if (!seenValues.has(inst.value)) {
          seenValues.add(inst.value);
          combined.push(inst);
        }
      }

      return combined.length > 0 ? combined : matchingPopular;
    } else {
      // Fallback to filtering popular instances
      return matchingPopular.length > 0 ? matchingPopular : POPULAR_INSTANCES;
    }
  } catch (error) {
    console.error('Failed to search instances:', error);
    // Fallback to filtering popular instances
    return matchingPopular.length > 0 ? matchingPopular : POPULAR_INSTANCES;
  }
}
