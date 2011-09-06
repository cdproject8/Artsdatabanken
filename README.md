# Artsdatabanken

We'll keep all documentation and code here..

## File structure

Feel free to modify this.

### Documentation, overall structure

* /doc/templates - Documentation templates
* /doc/meetings - Meeting notes
* /doc/timetables - Time sheets
* /doc/project\_report - Project report

#### Project report

Each section should have a separate folder in /doc/project\_report. Every
section folder should include a "index.tex" file that will be included in the
main report document.

Example: Simplified pre-study section

* /doc/project\_report/prestudy - Pre-Study folder
* /doc/project\_report/prestudy/index.tex	- Main Pre-Study file
* /doc/project\_report/prestudy/artsdatabanken.tex - Domain research
* /doc/project\_report/prestudy/tech\_comparison.tex - Comparison of technologies (android, ios, etc..)

index.tex will include artsdatabanken.tex and tech\_comparison.tex, the main
report file will include index.tex.

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

	git add -A .	
	git commit -m "I made some change.."
	git push

Explanation

1. Let git know which files you would like to commit (. is the current folder)
2. Commit the files to your local repository
3. Push the changes into the server

### Pull changes from server

NB! Before doing a pull, commit your changes or they can be lost forever.

	git pull

### Get some status informatoin

This will give you information on which files will be commited next, conflicts, etc.

	git status
