#!/bin/bash
../combine.sh > actual.csv
diff -I "Date*" expected.csv actual.csv

if [ $? -eq 0 ]; then
	echo -e "\e[1;32mSUCCESS\e[0m"
else
	echo -e "\e[1;31m FAILURE\e[0m"
fi;

rm actual.csv
