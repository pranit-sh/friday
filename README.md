# @friday README

**@friday** is an AI-powered project assistant for Visual Studio Code, built as a chat participant on top of GitHub Copilot. It leverages Retrieval-Augmented Generation (RAG) to answer your queries based on the documents you provide. With @friday, you can streamline your workflow and get instant, context-aware assistance directly within your editor.

## In Action
https://github.com/user-attachments/assets/ac977c48-d660-4330-8768-135a71e9019c

## Features

- **Document Ingestion**: Supports ingestion of local documents, URL documents and confluence pages for @friday to refer.
- **AI-Powered Assistance**: Ask questions about your project, and @friday will provide answers using ingested documents.

#### Supporting document formats:

`.docx `,
`.pptx `,
`.xlsx `,
`.pdf `,
`.png `,
`.jpg, .jpeg `,
`.webp `,
`.odt `,
`.odp `,
`.ods `,
`.csv `,
`.txt `,
`.json `,
`Plain text (e.g., .py, .ts, .md, etc.) `,
`Confluence Page`

## Extension Settings

- `/howto`: Get instructions on how to use Friday.
- `/ping`: Create connection to ensure Friday is active.
- `/ingest`: Ingest project documents in knowledgebase.

## Requirements

- Running Hana instance

>This version of @friday is supported for SAP HANA, but code can be extended to work with any type of database.

## Run Locally

1. **Clone the Repository**:
    ```bash
    git clone https://github.com/Pranit4u/friday.git
    cd friday
    ```

2. **Install Dependencies**:
  Ensure you have Node.js (version 20 or higher) installed, then run:
    ```bash
    npm install
    ```

3. **Set Up Environment Variables**:
  Create a `.env` file in the root directory and add the JSON string value of your AI Core service key:
    ```
    AICORE_SERVICE_KEY=<your-aicore-service-key>
    ```

4. **Start the Application**:
  Go to `extension.ts` and press `F5` key to build the project and open a new vscode window with loaded extension.

5. **Access the Application**:
  Open GitHub Copilot and use @friday as a chat participant to interact and get assistance. 

**Enjoy using @friday!**
