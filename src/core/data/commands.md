#### Commands Overview
1. `/ping`:  
Establishes db connection using the credentials in `friday.config.json`.

    >**Imp:** Run this after creating or updating the config file for updating the connection.

2. `/ingest`:  
Ingests documents from `friday.datasource` directory into the knowledge base.  
To ingest from document URL, create a `friday.file-urls.txt` file in this directory and add URLs (newline separated).

    **Optional flags:**
    - *(no flag)*:
      Ingests only new, unprocessed files/URLs.

    - `--sync`:
      Ingests new files and removes records of deleted files/URLs.

    - `--hard`:
      Clears all records and fully rebuilds the database from the available files/URLs.

    - `--list`:
      Lists the processed documents.

    - `--extracts-images`:
      Extracts text from images in the documents. This flag must follow `--sync` or `--hard`.

    - `--extract-attachments`:
      Extracts text from attachments in the documents. This flag must follow `--sync` or `--hard`.

    - `--use-llm`:
      Uses an LLM to extract text from images and attachments. If this flag is not set, OCR will be used for text extraction from images. This flag must follow `--sync` or `--hard`.
    >**Imp:** filename / url acts as the identifier to check if a document has been processed.