import { createDataProvider, CreateDataProviderOptions } from "@refinedev/rest";
import { HttpError } from "node_modules/@refinedev/core/dist/contexts/data/types";

type ListResponse<T = unknown> = {
  data?: T[];
  pagination?: {
    total: number;
  };
};

type CreateResponse<T = unknown> = {
  data?: T;
};

type GetOneResponse<T = unknown> = {
  data?: T;
};

const BACKEND_BASE_URL =
  import.meta.env.VITE_BACKEND_BASE_URL ?? "http://localhost:4000";

const buildHttpError = async (response: Response): Promise<HttpError> => {
  let message = 'Request failed';

  try{
    const payload = (await response.json()) as { message?: string };
    
    if(payload?.message) message = payload.message;
  }catch{
    // Ignore JSON parsing errors and use the default message
  }
  return {
    message,
    statusCode: response.status,
  }
}

const options: CreateDataProviderOptions = {
  getList: {
    getEndpoint: ({ resource }) => `api/${resource}`,

    buildQueryParams: async ({ resource, pagination, filters }) => {
      const params: Record<string, string | number> = {};

      if (pagination?.mode !== "off") {
        const page = pagination?.currentPage ?? 1;
        const pageSize = pagination?.pageSize ?? 10;

        params.page = page;
        params.limit = pageSize;
      }

      filters?.forEach((filter) => {
        const field = "field" in filter ? filter.field : "";
        const value = String(filter.value);

        if (field === "role") {
          params.role = value;
        }

        if (resource === "departments") {
          if (field === "name" || field === "code") params.search = value;
        }

        if (resource === "users") {
          if (field === "search" || field === "name" || field === "email") {
            params.search = value;
          }
        }

        if (resource === "subjects") {
          if (field === "department") params.department = value;
          if (field === "name" || field === "code") params.search = value;
        }

        if (resource === "classes") {
          if (field === "name") params.search = value;
          if (field === "subject") params.subject = value;
          if (field === "teacher") params.teacher = value;
        }
      });

      return params;
    },

    mapResponse: async (response) => {
      if(!response.ok) throw await buildHttpError(response);
      const payload: ListResponse = await response.json();
      return payload.data ?? [];
    },


    getTotalCount: async (response) => {
      if(!response.ok) throw await buildHttpError(response);
      const payload: ListResponse = await response.clone().json();
      return payload.pagination?.total ?? payload.data?.length ?? 0;
    },
  },

  create: {
    getEndpoint: ({ resource }) => `api/${resource}`,

    buildBodyParams: async ({ variables }) => variables,

    mapResponse: async (response) => {
      const json: CreateResponse = await response.json();
      return json.data ?? {};
    },
  },

  getOne: {
    getEndpoint: ({ resource, id }) => `api/${resource}/${id}`,

    mapResponse: async (response) => {
      const json: GetOneResponse = await response.json();
      return json.data ?? {};
    },
  },
};

const { dataProvider } = createDataProvider(BACKEND_BASE_URL, options);

export { dataProvider };