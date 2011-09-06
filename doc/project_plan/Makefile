project_plan.pdf: project_plan.tex references.bib prestudy/*
	pdflatex project_plan.tex
	bibtex project_plan.aux
	pdflatex project_plan.tex
	pdflatex project_plan.tex

clean:
	rm *.aux *.log *.blg *.bbl
