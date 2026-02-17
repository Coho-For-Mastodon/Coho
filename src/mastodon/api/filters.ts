import { getClientConfig } from '../config/client';
import { apiFetch } from '../../utils/api-client';
import type { Filter, CreateFilterParams, UpdateFilterParams } from '../types';

export const getFilters = async (): Promise<Filter[]> => {
  const { url } = getClientConfig();
  const response = await apiFetch(`https://${url}/api/v2/filters`, {
    method: 'GET',
  });
  const data = await response.json();
  return data as Filter[];
};

export const getFilter = async (id: string): Promise<Filter> => {
  const { url } = getClientConfig();
  const response = await apiFetch(`https://${url}/api/v2/filters/${id}`, {
    method: 'GET',
  });
  const data = await response.json();
  return data as Filter;
};

export const createFilter = async (
  params: CreateFilterParams
): Promise<Filter> => {
  const { url } = getClientConfig();
  const body = new URLSearchParams();
  body.set('title', params.title);
  body.set('filter_action', params.filter_action);

  for (const ctx of params.context) {
    body.append('context[]', ctx);
  }

  if (params.expires_in != null) {
    body.set('expires_in', String(params.expires_in));
  }

  if (params.keywords_attributes) {
    params.keywords_attributes.forEach((kw, i) => {
      body.set(`keywords_attributes[${i}][keyword]`, kw.keyword);
      body.set(`keywords_attributes[${i}][whole_word]`, String(kw.whole_word));
    });
  }

  const response = await apiFetch(`https://${url}/api/v2/filters`, {
    method: 'POST',
    body,
  });
  const data = await response.json();
  return data as Filter;
};

export const updateFilter = async (
  id: string,
  params: UpdateFilterParams
): Promise<Filter> => {
  const { url } = getClientConfig();
  const body = new URLSearchParams();

  if (params.title != null) {
    body.set('title', params.title);
  }

  if (params.filter_action != null) {
    body.set('filter_action', params.filter_action);
  }

  if (params.context) {
    for (const ctx of params.context) {
      body.append('context[]', ctx);
    }
  }

  if (params.expires_in !== undefined) {
    body.set(
      'expires_in',
      params.expires_in == null ? '' : String(params.expires_in)
    );
  }

  if (params.keywords_attributes) {
    params.keywords_attributes.forEach((kw, i) => {
      body.set(`keywords_attributes[${i}][keyword]`, kw.keyword);
      body.set(`keywords_attributes[${i}][whole_word]`, String(kw.whole_word));
      if (kw.id) {
        body.set(`keywords_attributes[${i}][id]`, kw.id);
      }
      if (kw._destroy) {
        body.set(`keywords_attributes[${i}][_destroy]`, 'true');
      }
    });
  }

  const response = await apiFetch(`https://${url}/api/v2/filters/${id}`, {
    method: 'PUT',
    body,
  });
  const data = await response.json();
  return data as Filter;
};

export const deleteFilter = async (id: string): Promise<void> => {
  const { url } = getClientConfig();
  await apiFetch(`https://${url}/api/v2/filters/${id}`, {
    method: 'DELETE',
  });
};
