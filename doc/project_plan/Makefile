project_plan.pdf:
	pdflatex project_plan.tex
	bibtex project_plan.aux
	pdflatex project_plan.tex
	pdflatex project_plan.tex

techcomparison:
	pdflatex export/techcomparison.tex -output-directory export

clean:
	rm *.aux *.log *.blg *.bbl *.toc *.lof *.lot

.PHONY: project_plan.pdf
