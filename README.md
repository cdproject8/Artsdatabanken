# Artsdatabanken

We'll keep all documentation and code here..

## File structure

Feel free to modify this.

### Documentation

* /doc/templates - Documentation templates
* /doc/meetings - Meeting notes


### Source code

* /src
* /src/main
* /src/test
* /src/sandbox

## Coding conventions

Default settings for Eclipse:

* Use tabs for indentation (not spaces)

## Git

### Commiting changes

	git -A add .	
	git commit -m "I made some change.."
	git push

Explanation

1. Let git know which files you would like to commit (. is the current folder)
2. Commit the files to your local repository
3. Push the changes into the server

### Pull changes from server

NB! Before doing a pull, commit your changes, or they can be lost forever.

	git pull

### Get some status informatoin

This will give you information on which files will be commited next, conflicts, etc.

	git status
