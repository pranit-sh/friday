/** Participant */
export const FRIDAY_PARTICIPANT_ID = 'chat-participant.friday';

/** LLM configs */
export const DEFAULT_INSERT_BATCH_SIZE = 500;
export enum SIMPLE_MODELS {
  'OPENAI_GPT4_O',
}
export enum SIMPLE_EMBEDDINGS {
  'TEXT_EMBEDDING_3_LARGE',
}

/** md Responses */
export const HOWTO_RESPONSE = `
Mention **@friday** to interact with your project assistant.

Use the following flags with \`howto\` command for details:

1. \`--setup\`: for required setup for Friday
2. \`--commands\`: for commands overview
3. \`--confluence\`: for setting up confluence connection
`;

export const SETUP_RESPONSE = `
#### Required Setup
To begin using Friday, ensure the following files and folders are present in your workspace root:
1. \`friday.datasource/\`:  
This folder serves as the primary source for Friday’s document ingestion. Place all documents to be processed here.

    >See [github repo](https://github.com/pranit-sh/friday#readme) for list of supporting document formats
2. \`friday.config.json\`:  
This file contains your database configuration. Use the format below:

    \`\`\`json
    {
      "project_id": "example_project_001",
      "hana_endpoint": "https://hana.example.com:443",
      "hana_user": "hana_admin",
      "hana_password": "SecureP@ssw0rd!"
    }
    \`\`\`
    >**Note:** The *project_id* will vary depending on the active project.
`;

export const COMMAND_RESPONSE = `
#### Commands Overview
1. \`/ping\`:  
Establishes db connection using the credentials in \`friday.config.json\`.

    >**Imp:** Run this after creating or updating the config file for updating the connection.

2. \`/ingest\`:  
Ingests documents from \`friday.datasource\` directory into the knowledge base.  
To ingest from document url, create a \`friday.file-urls.txt\` file in this directory and add urls (newline separated).

    **Optional flags:**
    - *(no flag)*:
      Ingests only new, unprocessed files/urls.

    - \`--sync\`:
      Ingests new files and removes records of deleted files/urls.

    - \`--hard\`:
      Clears all records and fully rebuilds the database from the available files/urls.
    
    - \`--list\`:
      Lists the processed documents.
    >**Imp:** filename / url acts as the identifier to check if a document has been processed.
`;

export const CONFLUENCE_RESPONSE = `
#### Confluence Setup
To use confluence documents for ingestion, add these fields in \`friday.config.json\` file.

\`\`\`json
{
  "confluence_base_url": "https://johndoe.atlassian.net",
  "confluence_user": "johndoe@email.com",
  "confluence_apikey": "<api_key>"
}
\`\`\`

Create \`friday.confluence-pages.txt\` file in the \`friday.datasource\` directory and add the pageIds (newline separated).  
Run the \`ingest\` command for ingestion.
>**Imp:** pageId acts as the identifier to check if a document has been processed.
`;
