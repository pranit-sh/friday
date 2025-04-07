# @friday README

**@friday** is an AI-powered project assistant for Visual Studio Code, built on top of GitHub Copilot. It leverages Retrieval-Augmented Generation (RAG) to answer your queries based on the documents you provide. With @friday, you can streamline your workflow and get instant, context-aware assistance directly within your editor. As an additional participant in your development process, @friday enhances productivity and collaboration.

## Features

- **AI-Powered Assistance**: Ask questions about your project, and @friday will provide answers based on the ingested documents.
- **Document Ingestion**: Easily upload and manage documents for @friday to reference.

\!\[@friday in action\]\(images/friday-demo.gif\)

## Extension Settings

- `/howto`: Get instructions on how to use Friday.
- `/ping`: Check connection to ensure Friday is active.
- `/ingest`: Ingest project documents in knowledgebase.

## Requirements

- Node.js (version 20 or higher)
- Running Hana instance

## Known Issues

- Large document ingestion may take additional time.
- Limited support for non-text-based documents (e.g., images, PDFs without text layers).
- No support for url ingestion

## Release Notes

### 1.0.0

- Initial release of @friday.
- Core features: document ingestion, query answering, and context-aware responses.

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
