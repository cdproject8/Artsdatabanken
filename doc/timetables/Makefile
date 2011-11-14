WEEKS=35 36 37 38 39 40 41 42 43 44 45
timetable:
	tools/combine.sh "$(WEEKS)" > timetable.csv
	tools/texify.sh timetable.csv > timetable.tex
	pdflatex timetable.tex
clean:
	rm *.log *.aux
.PHONY:
