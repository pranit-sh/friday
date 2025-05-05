#### Confluence Setup
To use confluence documents for ingestion, add these fields in `friday.config.json` file.

```json
{
  "confluence_base_url": "https://johndoe.atlassian.net",
  "confluence_user": "johndoe@email.com",
  "confluence_apikey": "<api_key>"
}
```

Create `friday.confluence-pages.txt` file in the `friday.datasource` directory and add the pageIds (newline separated).  
Run the `ingest` command for ingestion.
>**Imp:** pageId acts as the identifier to check if a document has been processed.