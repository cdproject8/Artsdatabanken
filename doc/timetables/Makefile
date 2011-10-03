WEEKS=39 40
timetable:
	tools/combine.sh "$(WEEKS)" > timetable.csv
	tools/texify.sh timetable.csv > timetable.tex
	pdflatex timetable.tex
clean:
	rm *.log *.aux
.PHONY:
