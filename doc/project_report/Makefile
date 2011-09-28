project_report.pdf:
	pdflatex project_report.tex
	bibtex project_report.aux
	pdflatex project_report.tex
	pdflatex project_report.tex

techcomparison:
	pdflatex export/techcomparison.tex -output-directory export

clean:
	rm *.aux *.log *.blg *.bbl *.toc *.lof *.lot

.PHONY: project_report.pdf
