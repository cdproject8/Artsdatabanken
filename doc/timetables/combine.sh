#!/bin/bash
if [ -n "$1" ]; then
	t_pre_study=0
	t_requirements=0
	for i in `ls "$1"`; do
		source "$1/$i"
		((t_pre_study += $pre_study))
		((t_requirements += $requirements))
	done;

	echo "Combined weekly report for week $1"
	echo "pre_study=$t_pre_study"	
	echo "requirements=$t_requirements"	
else
	echo "Enter week nr."
fi;
