#!/bin/bash
for dir in `ls | grep ^test | tr "\n" " "`; do
	if [ "`file $dir | sed 's/^.*: //'`" != "directory" ]; then continue; fi

	cd $dir
	../../combine.sh > actual.csv
	diff -I "Date*" expected.csv actual.csv

	if [ $? -eq 0 ]; then
		echo -e "$dir: \e[1;32mSUCCESS\e[0m"
	else
		echo -e "$dir: \e[1;31m FAILURE\e[0m"
	fi;

	rm actual.csv
	cd ../
done
