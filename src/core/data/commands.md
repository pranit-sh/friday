#### Commands Overview
1. `/ping`:  
Establishes db connection using the credentials in `friday.config.json`.

    >**Imp:** Run this after creating or updating the config file for updating the connection.

2. `/ingest`:  
Ingests documents from `friday.datasource` directory into the knowledge base.  
To ingest from document url, create a `friday.file-urls.txt` file in this directory and add urls (newline separated).

    **Optional flags:**
    - *(no flag)*:
      Ingests only new, unprocessed files/urls.

    - `--sync`:
      Ingests new files and removes records of deleted files/urls.

    - `--hard`:
      Clears all records and fully rebuilds the database from the available files/urls.
    
    - `--list`:
      Lists the processed documents.
    >**Imp:** filename / url acts as the identifier to check if a document has been processed.