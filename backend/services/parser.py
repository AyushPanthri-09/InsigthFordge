import os
import pandas as pd
from backend.utils.exceptions import ParserException
from backend.core.logger import logger

class DatasetParser:
    """
    Staged parser utilizing pandas to extract dataset matrices from CSV/Excel files.
    """
    
    @staticmethod
    def parse_file(file_path: str) -> pd.DataFrame:
        """
        Parses CSV or Excel (XLSX) file into a pandas DataFrame.
        """
        if not os.path.exists(file_path):
            logger.error(f"Parser error: File not found at '{file_path}'")
            raise ParserException("Target file does not exist.")
            
        ext = os.path.splitext(file_path)[1].lower()
        
        try:
            if ext == ".csv":
                # Attempt decoding using multiple encodings
                encodings = ["utf-8", "latin-1", "cp1252", "utf-16"]
                df = None
                
                # Check file size first
                if os.path.getsize(file_path) == 0:
                    raise ParserException("The uploaded file is empty.")
                    
                for encoding in encodings:
                    try:
                        df = pd.read_csv(file_path, encoding=encoding)
                        break
                    except (UnicodeDecodeError, pd.errors.ParserError):
                        continue
                        
                if df is None:
                    raise ParserException("Unable to decode CSV file with supported encodings.")
                    
            elif ext == ".xlsx":
                if os.path.getsize(file_path) == 0:
                    raise ParserException("The uploaded file is empty.")
                df = pd.read_excel(file_path, engine="openpyxl")
            else:
                raise ParserException(f"Unsupported file extension: {ext}")
                
            return df
            
        except pd.errors.EmptyDataError:
            logger.warning(f"File is empty: '{file_path}'")
            raise ParserException("The uploaded file contains no data (empty dataset).")
        except ParserException:
            raise
        except Exception as e:
            logger.error(f"Parsing error on file '{file_path}': {str(e)}")
            raise ParserException(f"Failed to parse file: {str(e)}")
