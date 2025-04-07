#### Required Setup
To begin using Friday, ensure the following files and folders are present in your workspace root:
1. `friday.datasource/`:  
This folder serves as the primary source for Friday’s document ingestion. Place all documents to be processed here.

    >**Supported formats:** .doc, .docx, .dot, .pdf, .csv, .txt, .xls, .xlsx, .json
2. `friday.config.json`:  
This file contains your database configuration. Use the format below:

    ```json
    {
      "project_id": "example_project_001",
      "hana_endpoint": "https://hana.example.com:443",
      "hana_user": "hana_admin",
      "hana_password": "SecureP@ssw0rd!"
    }
    ```
    >**Note:** The *project_id* will vary depending on the active project.
---
#### Commands Overview
1. `/ping`  
Establishes a connection using the credentials in `friday.config.json`.

    >**Note:** Run this after creating or updating the config file.
2. `/ingest`  
Ingests documents from `friday.datasource` into the knowledge base. File name acts as the identifier to check if a document has been processed.  
**Optional flags:**  
    - *(no flag)*:
      Ingests only new, unprocessed files.

    - `--sync`:
      Ingests new files and removes records of deleted files.

    - `--hard`:
      Clears all records and fully rebuilds the database from the current folder contents.
    
    - `--list`:
      Lists the processed documents.
---
#### Friday Assistant
Mention **@friday** to interact with your project assistant.