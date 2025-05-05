#### Required Setup
To begin using Friday, ensure the following files and folders are present in your workspace root:
1. `friday.datasource/`:  
This folder serves as the primary source for Friday’s document ingestion. Place all documents to be processed here.

    >See [github repo](https://github.com/pranit-sh/friday#readme) for list of supporting document formats
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